from typing import Annotated

from fastapi import Depends, Request

from app.content.loader import Content
from app.core.settings import Settings
from app.core.storage import DatasetStore


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _content(request: Request) -> Content:
    return request.app.state.content


def _dataset_store(request: Request) -> DatasetStore:
    return request.app.state.dataset_store


SettingsDep = Annotated[Settings, Depends(_settings)]
ContentDep = Annotated[Content, Depends(_content)]
DatasetStoreDep = Annotated[DatasetStore, Depends(_dataset_store)]
