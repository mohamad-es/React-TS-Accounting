FROM eclipse-temurin:21-jre
WORKDIR /validator
ADD https://repo1.maven.org/maven2/org/kosit/validator/1.6.3/validator-1.6.3-standalone.jar /validator/validator.jar
ADD https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-08-31/xrechnung-3.0.2-validator-configuration-2026-08-31.zip /tmp/config.zip
RUN apt-get update && apt-get install -y --no-install-recommends unzip && unzip /tmp/config.zip -d /validator && rm -rf /var/lib/apt/lists/* /tmp/config.zip
RUN chmod 644 /validator/validator.jar
USER 10001
ENTRYPOINT ["java","-jar","validator.jar","-s","scenarios.xml","-r","/validator","-D","-H","0.0.0.0","-P","8080","--disable-gui"]
