class AddEmailValidationToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :email_validated, :boolean, default: false
    add_column :users, :email_validation_token, :string
    add_index :users, :email_validation_token, unique: true
  end
end
