# Stage 1: Build Spring Boot application with Maven and JDK 21
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal GraalVM / JDK 21 runtime container
FROM ghcr.io/graalvm/jdk-community:21 AS runtime
WORKDIR /app

# Create non-root execution user
RUN groupadd -r polyglot && useradd -r -g polyglot polyglot
COPY --from=builder /build/target/polyglotmesh-backend-*.jar app.jar
RUN chown -R polyglot:polyglot /app

USER polyglot
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
