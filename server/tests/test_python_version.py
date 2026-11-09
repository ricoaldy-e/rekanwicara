import pytest

from app.main import python_version_warning


@pytest.mark.parametrize("version", [(3, 10), (3, 11)])
def test_supported_python_has_no_warning(version: tuple[int, int]) -> None:
    assert python_version_warning(version) is None


@pytest.mark.parametrize("version", [(3, 9), (3, 12), (3, 13)])
def test_unsupported_python_warns_clearly(version: tuple[int, int]) -> None:
    message = python_version_warning(version)
    assert message is not None
    assert f"{version[0]}.{version[1]}" in message
    assert "3.10 atau 3.11" in message
