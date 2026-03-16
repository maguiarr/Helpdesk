FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/HelpDeskApi/HelpDeskApi.csproj src/HelpDeskApi/
RUN dotnet restore src/HelpDeskApi/HelpDeskApi.csproj

COPY . .
RUN dotnet publish src/HelpDeskApi/HelpDeskApi.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

USER 1001
EXPOSE 8080

ENTRYPOINT ["dotnet", "HelpDeskApi.dll"]
