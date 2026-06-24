"""fix schema: due_date to Date, title to 500, drop priority, add unique to completion_log

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('task') as batch_op:
        batch_op.alter_column('due_date',
                              existing_type=sa.String(50),
                              type_=sa.Date(),
                              nullable=True)
        batch_op.alter_column('title',
                              existing_type=sa.String(100),
                              type_=sa.String(500),
                              nullable=False)
        batch_op.drop_column('priority')

    with op.batch_alter_table('completion_log') as batch_op:
        batch_op.create_foreign_key('fk_completion_log_user', 'user', ['user_id'], ['id'])
        batch_op.create_unique_constraint('uq_completion_log', ['user_id', 'task_id', 'completed_date'])


def downgrade():
    with op.batch_alter_table('completion_log') as batch_op:
        batch_op.drop_constraint('uq_completion_log', type_='unique')
        batch_op.drop_constraint('fk_completion_log_user', type_='foreignkey')

    with op.batch_alter_table('task') as batch_op:
        batch_op.add_column(sa.Column('priority', sa.String(50), nullable=True, server_default='Medium'))
        batch_op.alter_column('title',
                              existing_type=sa.String(500),
                              type_=sa.String(100),
                              nullable=False)
        batch_op.alter_column('due_date',
                              existing_type=sa.Date(),
                              type_=sa.String(50),
                              nullable=True)
