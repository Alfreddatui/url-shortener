terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Resolve the latest Ubuntu 22.04 LTS AMI for the target region
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group: allow HTTP, HTTPS, SSH from anywhere; all outbound
resource "aws_security_group" "app" {
  name        = "ogp-url-shortener-sg"
  description = "HTTP, HTTPS, SSH inbound; all outbound"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ogp-url-shortener-sg"
  }
}

# Allocate a static public IP — survives instance stop/start
resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "ogp-url-shortener-eip"
  }
}

# EC2 instance
resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.app.id]

  # Bootstrap script runs on first boot: installs Docker, clones repo, starts app
  user_data = templatefile("${path.module}/user_data.sh", {
    db_name     = var.db_name
    db_user     = var.db_user
    db_password = var.db_password
    base_url    = "http://${aws_eip.app.public_ip}"
    client_url  = "http://${aws_eip.app.public_ip}"
    repo_url    = "https://github.com/Alfreddatui/url-shortener.git"
  })

  # Enough disk for Docker images + postgres data
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "ogp-url-shortener"
  }
}

# Bind the static IP to the instance
resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
