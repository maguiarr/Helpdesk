FROM jenkins/jenkins:lts-jdk17

USER root

# Install Node.js 20.x
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install Playwright browser dependencies pinned to the project's version
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY e2e/package.json e2e/package-lock.json* /tmp/e2e/
RUN cd /tmp/e2e && npm ci && npx playwright install --with-deps chromium firefox && rm -rf /tmp/e2e
RUN chmod -R 755 /ms-playwright

# Ensure npm cache is writable by arbitrary UIDs (OpenShift runs as non-root random UID)
RUN mkdir -p /.npm && chmod -R 777 /.npm

# Install Jenkins plugins
COPY jenkins/plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins

# Disable setup wizard + relax CSP so Playwright HTML reports render
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dhudson.model.DirectoryBrowserSupport.CSP=\"sandbox allow-scripts allow-same-origin; default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;\""
ENV CASC_JENKINS_CONFIG="/var/jenkins_home/casc_configs/"
