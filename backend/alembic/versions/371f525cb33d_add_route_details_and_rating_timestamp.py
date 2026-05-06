"""add_route_details_and_rating_timestamp

Revision ID: 371f525cb33d
Revises: f657e81afb86
Create Date: 2026-05-06 21:47:03.312735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '371f525cb33d'
down_revision: Union[str, None] = 'f657e81afb86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('canonical_routes', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('canonical_routes', sa.Column('image_url', sa.Text(), nullable=True))
    op.add_column('user_route_ratings', sa.Column('last_ranked_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')))


def downgrade() -> None:
    op.drop_column('user_route_ratings', 'last_ranked_at')
    op.drop_column('canonical_routes', 'image_url')
    op.drop_column('canonical_routes', 'description')
