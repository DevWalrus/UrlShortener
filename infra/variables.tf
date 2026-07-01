variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

variable "project" {
  description = "Short project name used in resource naming"
  type        = string
  default     = "clinten"
}

variable "creator_api_key" {
  description = "Shared secret for authenticating requests to the creator API"
  type        = string
  sensitive   = true
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}