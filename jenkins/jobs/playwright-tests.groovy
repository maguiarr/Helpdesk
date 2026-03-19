// ==========================================================================
// REFERENCE ONLY — This file is NOT used at runtime.
//
// The canonical job definition lives inline in the JCasC config:
//   - Local:     jenkins/casc/jenkins.yaml  (jobs: section)
//   - OpenShift: helm/templates/jenkins-casc-configmap.yaml
//
// This file is kept for documentation / quick reference only.
// If you need to change the job, edit the JCasC sources above.
// ==========================================================================

job('Run-Playwright-Tests') {
    description('Runs Playwright E2E tests against HelpDesk Pro')

    parameters {
        stringParam('BASE_URL', '${DEFAULT_BASE_URL:-http://localhost:4200}', 'Base URL of the application under test')
        choiceParam('BROWSER_PROJECT', ['all', 'employee-chromium', 'employee-firefox', 'admin-chromium', 'admin-firefox'], 'Which browser project(s) to run')
        stringParam('TEST_RETRIES', '1', 'Number of test retries')
    }

    scm {
        git {
            remote {
                url('https://github.com/maguiarr/Helpdesk.git')
            }
            branch('main')
        }
    }

    wrappers {
        credentialsBinding {
            string('EMPLOYEE_USERNAME', 'employee-username')
            string('EMPLOYEE_PASSWORD', 'employee-password')
            string('ADMIN_USERNAME', 'admin-username')
            string('ADMIN_PASSWORD', 'admin-password')
        }
    }

    steps {
        shell('''
            cd e2e
            chmod +x scripts/*.sh
            export BASE_URL="${BASE_URL}"
            export TEST_RETRIES="${TEST_RETRIES}"
            export BROWSER_PROJECT="${BROWSER_PROJECT}"
            ./scripts/ci-entrypoint.sh
        ''')
    }

    publishers {
        publishHtml {
            report('e2e/playwright-report') {
                reportName('Playwright Report')
                allowMissing(true)
                keepAll(true)
                alwaysLinkToLastBuild(true)
            }
        }
        archiveArtifacts {
            pattern('e2e/test-results/**')
            allowEmpty(true)
        }
    }
}
