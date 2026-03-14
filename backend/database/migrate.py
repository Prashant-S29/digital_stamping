from database.db import engine, Base
import database.models  # noqa: F401 — import models so Base knows about them


def run():
    print("Running migrations...")
    Base.metadata.create_all(bind=engine)
    print("Done. Tables created:")
    for table in Base.metadata.tables:
        print(f"  ✓ {table}")


if __name__ == "__main__":
    run()