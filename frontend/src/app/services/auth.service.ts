import { Injectable, signal } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _username = signal('');
  private _roles = signal<string[]>([]);
  private _isAdmin = signal(false);
  private _isLoggedIn = signal(false);

  readonly username = this._username.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly isAdmin = this._isAdmin.asReadonly();
  readonly isLoggedIn = this._isLoggedIn.asReadonly();

  constructor(
    private keycloak: KeycloakService,
    private configService: ConfigService
  ) {}

  async init(): Promise<void> {
    const keycloakUrl = this.configService.keycloakUrl();

    await this.keycloak.init({
      config: {
        url: keycloakUrl,
        realm: this.configService.keycloakRealm(),
        clientId: this.configService.keycloakClientId()
      },
      initOptions: {
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256'
      },
      enableBearerInterceptor: false
    });

    const loggedIn = await this.keycloak.isLoggedIn();
    this._isLoggedIn.set(loggedIn);

    if (loggedIn) {
      const token = this.keycloak.getKeycloakInstance().tokenParsed;
      this._username.set(token?.['preferred_username'] ?? '');
      const roles = this.keycloak.getUserRoles();
      this._roles.set(roles);
      this._isAdmin.set(roles.includes('helpdesk-admin'));
    }
  }

  async getToken(): Promise<string> {
    return await this.keycloak.getToken();
  }

  logout(): void {
    this.keycloak.logout();
  }
}
