FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY quiz-service/QuizService/QuizService.csproj quiz-service/QuizService/
RUN dotnet restore quiz-service/QuizService/QuizService.csproj

COPY . .
RUN dotnet publish quiz-service/QuizService/QuizService.csproj -c Release -o /app/publish

# Bundle frontend static site into quiz-service so frontend + web api run in one container.
RUN mkdir -p /app/publish/wwwroot && cp -R frontend/. /app/publish/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends unixodbc odbcinst unzip libaio1t64 libnsl2 ca-certificates \
    && for d in /lib/*-linux-gnu /usr/lib/*-linux-gnu; do \
         if [ -e "$d/libaio.so.1t64" ] && [ ! -e "$d/libaio.so.1" ]; then \
           ln -sfn "$d/libaio.so.1t64" "$d/libaio.so.1"; \
         fi; \
       done \
    && rm -rf /var/lib/apt/lists/*

COPY scripts/install-oracle-odbc.sh /tmp/install-oracle-odbc.sh
COPY docker/oracle/packages/ /tmp/oracle/packages/
RUN chmod +x /tmp/install-oracle-odbc.sh \
    && /tmp/install-oracle-odbc.sh /tmp/oracle/packages \
    && rm -rf /tmp/oracle /tmp/install-oracle-odbc.sh

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://0.0.0.0:10001
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
EXPOSE 10001

ENTRYPOINT ["dotnet", "QuizService.dll"]
