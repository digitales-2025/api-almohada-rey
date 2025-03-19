pipeline {
	agent {
		docker {
			image 'node:22'
			reuseNode true
		}
	}
	stages {
		stage('Install') {
			steps {
				sh 'npm i -g pnpm'
				sh 'pnpm i'
				sh 'pnpx prisma generate'
			}
		}
		stage('Validate lint rules') {
			steps {
				sh 'pnpm run lint'
			}
		}
		stage('Build project') {
			steps {
				sh 'pnpm run build'
			}
		}
	}
}