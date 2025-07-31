pipeline {
	agent {
		docker {
			image 'guergeiro/pnpm:22-10-alpine'
			reuseNode true
			args '-u 0:0 -v /home/jenkinsci/pnpm-store:/root/.pnpm-store'
		}
	}
	stages {
		stage('Install dependencies') {
			steps {
				sh 'pnpm config set store-dir /root/.pnpm-store'
				sh 'pnpm i --frozen-lockfile'
			}
		}
		stage('Generate Prisma types') {
			steps {
				sh 'pnpx prisma generate'
			}
		}
		stage('Validate lint rules') {
			steps {
				sh 'pnpm run lint'
			}
		}
		stage('Build ') {
			steps {
				sh 'pnpm run build'
			}
		}
	}
	post {
		always {
			sh 'rm -rf node_modules'
		}
	}
}

