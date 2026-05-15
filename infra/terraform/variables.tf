variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  default     = "phygitron360"
}

variable "db_username" {
  description = "Database master username"
  default     = "phygitron_admin"
}

variable "db_password" {
  description = "Database master password"
  sensitive   = true
}

variable "superadmin_email" {
  description = "Superadmin email for initial seeding"
}

variable "superadmin_password" {
  description = "Superadmin password for initial seeding"
  sensitive   = true
}
