FROM maven:3.9.11-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml ./
RUN mvn --batch-mode --no-transfer-progress dependency:go-offline
COPY src ./src
RUN mvn --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:21-jre

RUN useradd --system --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar ./app.jar
RUN chown appuser:appuser /app/app.jar

USER appuser
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "if [ -z \"$DB_URL\" ] && [ -n \"$DATABASE_URL\" ]; then export DB_URL=\"jdbc:$DATABASE_URL\"; fi; exec java ${JAVA_OPTS:--XX:+UseSerialGC -Xms12m -Xmx36m -XX:MaxMetaspaceSize=56m -XX:CompressedClassSpaceSize=8m -XX:ReservedCodeCacheSize=12m -XX:MaxDirectMemorySize=4m -XX:TieredStopAtLevel=1 -Xss256k -Dspring.main.lazy-initialization=true -Dspring.jmx.enabled=false -Dserver.tomcat.threads.max=6 -Dserver.tomcat.threads.min-spare=1} -jar /app/app.jar"]
