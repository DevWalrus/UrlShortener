resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project}-logs"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project}-env"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
}

resource "azurerm_user_assigned_identity" "redirect" {
  name                = "${var.project}-redirect-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_user_assigned_identity" "creator_api" {
  name                = "${var.project}-creator-api-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_key_vault_access_policy" "redirect" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.redirect.principal_id

  secret_permissions = ["Get"]
}

resource "azurerm_key_vault_access_policy" "creator_api" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.creator_api.principal_id

  secret_permissions = ["Get"]
}

resource "azurerm_container_app" "redirect" {
  name                         = "${var.project}-redirect"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.redirect.id]
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name   = "redirect"
      image  = "${azurerm_container_registry.main.login_server}/clinten-redirect:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8080
        initial_delay            = 5
        interval_seconds         = 10
        failure_count_threshold  = 3
      }

      readiness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8080
        interval_seconds        = 10
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name                = "mongodb-uri"
    key_vault_secret_id = azurerm_key_vault_secret.mongodb_uri.id
    identity            = azurerm_user_assigned_identity.redirect.id
  }

  secret {
    name                = "registry-password"
    key_vault_secret_id = azurerm_key_vault_secret.registry_password.id
    identity            = azurerm_user_assigned_identity.redirect.id
  }

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [azurerm_key_vault_access_policy.redirect]
}

resource "azurerm_user_assigned_identity" "creator_api_stage" {
  name                = "${var.project}-creator-api-stage-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_key_vault_access_policy" "creator_api_stage" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.creator_api_stage.principal_id

  secret_permissions = ["Get"]
}

resource "azurerm_container_app" "creator_api_stage" {
  name                         = "${var.project}-creator-api-stage"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.creator_api_stage.id]
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "creator-api"
      image  = "${azurerm_container_registry.main.login_server}/clinten-creator-api:stage"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name  = "MONGODB_DB"
        value = "clintendev-stage"
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8080
        initial_delay            = 5
        interval_seconds         = 10
        failure_count_threshold  = 3
      }

      readiness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8080
        interval_seconds        = 10
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name                = "mongodb-uri"
    key_vault_secret_id = azurerm_key_vault_secret.mongodb_uri.id
    identity            = azurerm_user_assigned_identity.creator_api_stage.id
  }

  secret {
    name                = "registry-password"
    key_vault_secret_id = azurerm_key_vault_secret.registry_password.id
    identity            = azurerm_user_assigned_identity.creator_api_stage.id
  }

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [azurerm_key_vault_access_policy.creator_api_stage]
}

resource "azurerm_container_app" "creator_api" {
  name                         = "${var.project}-creator-api"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.creator_api.id]
  }

  template {
    min_replicas = 0
    max_replicas = 2

    container {
      name   = "creator-api"
      image  = "${azurerm_container_registry.main.login_server}/clinten-creator-api:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8080
        initial_delay            = 5
        interval_seconds         = 10
        failure_count_threshold  = 3
      }

      readiness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8080
        interval_seconds        = 10
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name                = "mongodb-uri"
    key_vault_secret_id = azurerm_key_vault_secret.mongodb_uri.id
    identity            = azurerm_user_assigned_identity.creator_api.id
  }

  secret {
    name                = "registry-password"
    key_vault_secret_id = azurerm_key_vault_secret.registry_password.id
    identity            = azurerm_user_assigned_identity.creator_api.id
  }

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [azurerm_key_vault_access_policy.creator_api]
}