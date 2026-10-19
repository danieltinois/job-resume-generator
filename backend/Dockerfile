# syntax=docker/dockerfile:1

# --- build -----------------------------------------------------------------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q -DskipTests package && cp target/resume-tailor-*.jar /app.jar

# --- runtime ---------------------------------------------------------------
FROM eclipse-temurin:21-jre
ARG TYPST_VERSION=0.15.0
ARG TARGETARCH

# Typst renders the PDFs; pinned, like the version CI tests against.
RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) arch=x86_64 ;; \
      arm64) arch=aarch64 ;; \
      *) echo "unsupported architecture ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl xz-utils ca-certificates; \
    curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${arch}-unknown-linux-musl.tar.xz" \
      | tar -xJ --strip-components=1 -C /usr/local/bin "typst-${arch}-unknown-linux-musl/typst"; \
    apt-get purge -y curl xz-utils; \
    apt-get autoremove -y; \
    rm -rf /var/lib/apt/lists/*; \
    typst --version

RUN useradd --system --uid 10001 --home-dir /app app
COPY --from=build /app.jar /app/app.jar
USER app
WORKDIR /app
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
