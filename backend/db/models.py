from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Person(Base):
    __tablename__ = "persons"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    track_id   = Column(Integer, nullable=False, unique=True)
    label      = Column(String, nullable=True)
    first_seen = Column(DateTime, server_default=func.now())
    last_seen  = Column(DateTime, onupdate=func.now())

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    track_id   = Column(Integer, nullable=False)
    activity   = Column(String, nullable=False)
    confidence = Column(Float)
    bbox_x1    = Column(Float); bbox_y1 = Column(Float)
    bbox_x2    = Column(Float); bbox_y2 = Column(Float)
    frame_ts   = Column(DateTime, server_default=func.now())

class Event(Base):
    __tablename__ = "events"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    track_id      = Column(Integer, nullable=False)
    event_type    = Column(String, nullable=False)
    severity      = Column(String, nullable=False)
    started_at    = Column(DateTime, server_default=func.now())
    resolved_at   = Column(DateTime, nullable=True)
    acknowledged  = Column(Boolean, default=False)
    snapshot_path = Column(String, nullable=True)
    alerts        = relationship("Alert", back_populates="event")

class Alert(Base):
    __tablename__ = "alerts"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    event_id  = Column(Integer, ForeignKey("events.id"), nullable=True)
    channel   = Column(String, nullable=False)
    status    = Column(String, nullable=False)
    sent_at   = Column(DateTime, server_default=func.now())
    error_msg = Column(String, nullable=True)
    event     = relationship("Event", back_populates="alerts")
