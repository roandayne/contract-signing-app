class User < ApplicationRecord
    has_secure_password

    has_many :forms, dependent: :destroy
    has_many :submissions, dependent: :destroy
    
    validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
    validates :password, presence: true, on: :create
    validates :email_validation_token, uniqueness: true, allow_nil: true
    validates :email_validated, inclusion: { in: [true, false] }
end
