from typing import Annotated

from fastapi import Depends, Request

from app.content.loader import Content
from app.core.settings import Settings
from app.core.storage import DatasetStore
from app.core.thresholds import Thresholds
from app.dataset.labels import LabelStore
from app.pipeline.calibration import CalibrationStore


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _content(request: Request) -> Content:
    return request.app.state.content


def _dataset_store(request: Request) -> DatasetStore:
    return request.app.state.dataset_store


def _thresholds(request: Request) -> Thresholds:
    return request.app.state.thresholds


def _calibration_store(request: Request) -> CalibrationStore:
    return request.app.state.calibration_store


def _label_store(request: Request) -> LabelStore:
    return request.app.state.label_store


SettingsDep = Annotated[Settings, Depends(_settings)]
LabelStoreDep = Annotated[LabelStore, Depends(_label_store)]
ContentDep = Annotated[Content, Depends(_content)]
DatasetStoreDep = Annotated[DatasetStore, Depends(_dataset_store)]
ThresholdsDep = Annotated[Thresholds, Depends(_thresholds)]
CalibrationStoreDep = Annotated[CalibrationStore, Depends(_calibration_store)]
