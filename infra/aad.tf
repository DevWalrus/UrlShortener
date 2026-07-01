data "azuread_client_config" "current" {}

resource "azuread_application" "creator_ui" {
  display_name     = "${var.project}-creator-ui"
  sign_in_audience = "AzureADMyOrg"

  web {
    redirect_uris = [
      "https://create.clinten.dev/.auth/login/aad/callback",
      "http://localhost:5173/.auth/login/aad/callback",
    ]
  }
}

resource "azuread_service_principal" "creator_ui" {
  client_id = azuread_application.creator_ui.client_id
}

resource "azuread_application_password" "creator_ui" {
  application_id = azuread_application.creator_ui.id
  display_name   = "swa-secret"
  end_date       = "2028-01-01T00:00:00Z"
}