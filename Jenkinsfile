pipeline {
    // Pinned to the node where docker + a working kubeconfig already exist.
    // Change 'master' to whatever that node is actually labeled in
    // Manage Jenkins → Nodes if it's not called "master".
    agent { label 'master' }

    

    environment {
        AWS_ACCOUNT_ID   = '414343714505'
        AWS_REGION       = 'ap-south-1'
        ECR_REPO_NAME    = 'sakib'
        ECR_REGISTRY     = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_TAG        = "v${BUILD_NUMBER}"
        FULL_IMAGE       = "${ECR_REGISTRY}/${ECR_REPO_NAME}:${IMAGE_TAG}"
        LATEST_IMAGE     = "${ECR_REGISTRY}/${ECR_REPO_NAME}:latest"

        AWS_ACCESS_KEY_ID_CRED     = 'aws-access-key-id'
        AWS_SECRET_ACCESS_KEY_CRED = 'aws-secret-access-key'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/faizan015516/Techhelp.git'
            }
        }

     stage('OWASP Dependency-Check') {
       steps {
        sh 'mkdir -p reports/dependency-check'

        dependencyCheck(
            odcInstallation: 'Dependency-Check',
            nvdCredentialsId: 'C17495D4-AF6F-4F68-870A-10F4C9E2880A',
            additionalArguments: '--scan . --format XML --format HTML --out reports/dependency-check'
         )

        dependencyCheckPublisher(
            pattern: 'reports/dependency-check/dependency-check-report.xml',
            failedTotalCritical: 0,
            failedTotalHigh: 0,
            stopBuild: true,
            skipNoReportFiles: false
                   )

        archiveArtifacts(
            artifacts: 'reports/dependency-check/*',
            allowEmptyArchive: false
             )
          }
        }


        
         stage('SonarQube Scan') {
           steps {
             script {
            def scannerHome = tool 'sonar-scanner'

            withSonarQubeEnv('SonarQube') {withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]){
                sh """
                    ${scannerHome}/bin/sonar-scanner \\
                      -Dsonar.projectKey=cicd \\
                      -Dsonar.sources=. \\
                      -Dsonar.token=\$SONAR_TOKEN \\
                      -Dsonar.host.url=${SONAR_HOST_URL} \\
                      -Dsonar.exclusions=**/.git/**,**/node_modules/**,**/dist/**,**/build/**
                """
                 }
                }
               }
              }
           }

        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
         stage('Docker Build') {
            steps {
                sh """
                    docker build -t ${FULL_IMAGE} -t ${LATEST_IMAGE} .
                """
            }
        }

        stage('ECR Login') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \\
                    docker login --username AWS --password-stdin ${ECR_REGISTRY}
                """
            }
        }

        stage('Push to ECR') {
            steps {
                sh """
                    docker push ${FULL_IMAGE}
                    docker push ${LATEST_IMAGE}
                """
            }
        }

        stage('Deploy to Docker') {
            steps {
                sh """
                    docker pull ${FULL_IMAGE}
                    docker rm -f techhelp || true

                    docker run -d \\
                      --name techhelp \\
                      --restart unless-stopped \\
                      -p 80:81 \\
                      "${FULL_IMAGE}"
                """
            }
        }
    }

    post {
        success {
            echo "Successfully deployed ${FULL_IMAGE}"
        }

        failure {
            echo 'Pipeline failed. Check the Jenkins console output.'
        }
    }
}
