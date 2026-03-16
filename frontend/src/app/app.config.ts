import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { ConfigService } from './services/config.service';
import { AuthService } from './services/auth.service';

function initializeApp(configService: ConfigService, authService: AuthService) {
  return async () => {
    await configService.load();
    await authService.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    KeycloakService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService, AuthService],
      multi: true
    }
  ]
};
