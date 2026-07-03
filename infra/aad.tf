data "azuread_client_config" "current" {}

resource "azuread_application" "github_actions" {
  display_name = "github-actions-clinten"
}

resource "azuread_service_principal" "github_actions" {
  client_id = azuread_application.github_actions.client_id
}

resource "azuread_application_federated_identity_credential" "github_actions_prod" {
  application_id = azuread_application.github_actions.id
  display_name   = "github-actions-prod"
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:DevWalrus/UrlShortener:environment:prod"
  audiences      = ["api://AzureADTokenExchange"]
}

resource "azuread_application_federated_identity_credential" "github_actions_stage" {
  application_id = azuread_application.github_actions.id
  display_name   = "github-actions-stage"
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:DevWalrus/UrlShortener:environment:stage"
  audiences      = ["api://AzureADTokenExchange"]
}

resource "azurerm_role_assignment" "github_actions" {
  scope                = "/subscriptions/${var.subscription_id}/resourceGroups/rg-clinten"
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.github_actions.object_id
}