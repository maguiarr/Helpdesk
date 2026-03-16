NAMESPACE ?= helpdesk-pro
COMPOSE := docker compose

.PHONY: up down logs deploy status routes

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f

deploy:
	helm dependency update helm/
	helm upgrade --install helpdesk-pro helm/ \
		--namespace $(NAMESPACE) \
		--values helm/values.yaml \
		--values helm/values.openshift.yaml \
		--wait --timeout 10m

status:
	@echo "=== Pods ==="
	oc get pods -n $(NAMESPACE)
	@echo "\n=== Services ==="
	oc get svc -n $(NAMESPACE)
	@echo "\n=== Routes ==="
	oc get routes -n $(NAMESPACE)

routes:
	@oc get routes -n $(NAMESPACE) -o custom-columns=NAME:.metadata.name,HOST:.spec.host,PATH:.spec.path
