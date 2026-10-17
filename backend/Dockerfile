FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    VIRTUAL_ENV=/opt/venv

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && \
    python -m venv ${VIRTUAL_ENV} && \
    apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
WORKDIR /build
COPY pyproject.toml ./
COPY app/__init__.py app/__init__.py
COPY worker/__init__.py worker/__init__.py
COPY cli/__init__.py cli/__init__.py
RUN pip install --upgrade pip && pip install .

FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:${PATH}"

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system moneybot && useradd --system --gid moneybot --home /app moneybot

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=moneybot:moneybot . .

USER moneybot
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
