pipeline {
	agent {
		docker {
			image 'guergeiro/pnpm:22-10-alpine'
			reuseNode true
			args '-u 0:0 -v pnpm-store:/root/.pnpm-store'
		}
	}
	environment {
		NEXT_PUBLIC_IMAGE_DOMAIN="http://example.com"
		PNPM_HOME="/root/.local/share/pnpm"
	}
	stages {
		stage('Install dependencies') {
			steps {
				sh 'pnpm config set store-dir /root/.pnpm-store'
				sh 'pnpm i --frozen-lockfile'
			}
		}
		stage('Build Nextjs project') {
			steps {
				sh 'pnpm run check'
				sh 'pnpm run build'
			}
		}
	}
}

