class AddPageNumberToSignatures < ActiveRecord::Migration[8.0]
  def change
    add_column :signatures, :page_number, :integer
  end
end
