FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY SoftServices.Api.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# Database and uploaded images live on a volume mounted at /data. The image runs as the non-root
# "app" user, so /data must belong to it (a new named volume copies this ownership).
USER root
RUN mkdir -p /data/uploads /app/wwwroot \
    && rm -rf /app/wwwroot/uploads && ln -s /data/uploads /app/wwwroot/uploads \
    && chown -R app:app /data
USER app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__Default="Data Source=/data/softservices.db"
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["dotnet", "SoftServices.Api.dll"]
