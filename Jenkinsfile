// Jenkinsfile for StatusPulse (3-tier demo)
//
// Flow: GitHub push -> Jenkins build -> push images to DockerHub -> deploy to Minikube
//
// Written for a Jenkins agent running on WINDOWS (uses `bat`).
// If your agent is Linux/Mac, swap every `bat` step for `sh` and use
// forward-slash paths.

pipeline {
    agent any

    // Trigger on GitHub webhook push (requires Jenkins reachable from GitHub,
    // see README for the local-Jenkins caveat + Poll SCM fallback).
    triggers {
        githubPush()
    }

    environment {
        DOCKERHUB_CREDS   = credentials('dockerhub-creds')   // Jenkins "Username with password" credential id
        DOCKERHUB_USER    = "${DOCKERHUB_CREDS_USR}"
        IMAGE_TAG         = "${env.BUILD_NUMBER}"
        BACKEND_IMAGE     = "${DOCKERHUB_USER}/statuspulse-backend"
        FRONTEND_IMAGE    = "${DOCKERHUB_USER}/statuspulse-frontend"
        KUBE_NAMESPACE    = "statuspulse"
        // EDIT THIS: must match the Windows user that ran `minikube start`,
        // i.e. wherever %USERPROFILE%\.kube\config actually lives.
        // Only needed if Jenkins runs as a different account than that user
        // (e.g. as a Windows service under Local System).
        KUBECONFIG        = "C:\\Users\\YOUR_WINDOWS_USERNAME\\.kube\\config"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend Image') {
            steps {
                bat "docker build -t %BACKEND_IMAGE%:%IMAGE_TAG% -t %BACKEND_IMAGE%:latest ./backend"
            }
        }

        stage('Build Frontend Image') {
            steps {
                bat "docker build -t %FRONTEND_IMAGE%:%IMAGE_TAG% -t %FRONTEND_IMAGE%:latest ./frontend"
            }
        }

        stage('Push Images to DockerHub') {
            steps {
                bat "echo %DOCKERHUB_CREDS_PSW%| docker login -u %DOCKERHUB_CREDS_USR% --password-stdin"
                bat "docker push %BACKEND_IMAGE%:%IMAGE_TAG%"
                bat "docker push %BACKEND_IMAGE%:latest"
                bat "docker push %FRONTEND_IMAGE%:%IMAGE_TAG%"
                bat "docker push %FRONTEND_IMAGE%:latest"
            }
        }

        stage('Verify kubectl Context') {
            steps {
                // Fails fast with a clear signal if Jenkins can't see the
                // minikube kubeconfig, instead of failing later on a
                // confusing "Authentication required" HTML response.
                bat "kubectl config current-context"
                bat "kubectl get nodes"
            }
        }

        stage('Apply K8s Manifests (first run / structural changes)') {
            steps {
                // Safe to re-run every build: creates anything missing,
                // no-ops on anything unchanged. Actual image rollout happens
                // in the next stage via `kubectl set image`.
                bat "kubectl apply -f k8s/00-namespace.yaml"
                bat "kubectl apply -f k8s/01-secrets.yaml"
                bat "kubectl apply -f k8s/02-db.yaml"
                bat "kubectl apply -f k8s/03-backend.yaml"
                bat "kubectl apply -f k8s/04-frontend.yaml"
            }
        }

        stage('Deploy to Minikube') {
            steps {
                bat "kubectl set image deployment/backend backend=%BACKEND_IMAGE%:%IMAGE_TAG% -n %KUBE_NAMESPACE%"
                bat "kubectl set image deployment/frontend frontend=%FRONTEND_IMAGE%:%IMAGE_TAG% -n %KUBE_NAMESPACE%"
                bat "kubectl rollout status deployment/backend -n %KUBE_NAMESPACE% --timeout=120s"
                bat "kubectl rollout status deployment/frontend -n %KUBE_NAMESPACE% --timeout=120s"
            }
        }
    }

    post {
        success {
            echo "Deployed build #${env.BUILD_NUMBER}. Run: minikube service frontend -n ${KUBE_NAMESPACE}"
        }
        failure {
            echo "Pipeline failed - check the stage logs above."
        }
        always {
            bat "docker logout"
        }
    }
}
