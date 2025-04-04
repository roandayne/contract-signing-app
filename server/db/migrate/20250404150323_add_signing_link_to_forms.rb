class AddSigningLinkToForms < ActiveRecord::Migration[8.0]
  def change
    add_column :forms, :signing_link, :string
  end
end
