class AddSubmissionToForms < ActiveRecord::Migration[8.0]
  def change
    add_reference :forms, :submission, foreign_key: { on_delete: :nullify }
  end
end
