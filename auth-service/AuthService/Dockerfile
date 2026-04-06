FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY auth-service/AuthService/AuthService.csproj auth-service/AuthService/
RUN dotnet restore auth-service/AuthService/AuthService.csproj

COPY . .
RUN dotnet publish auth-service/AuthService/AuthService.csproj -c Release -o /app/publish

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

ENV ASPNETCORE_URLS=http://0.0.0.0:10000
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
EXPOSE 10000

ENTRYPOINT ["dotnet", "AuthService.dll"]
