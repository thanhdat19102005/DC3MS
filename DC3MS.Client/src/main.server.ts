import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { config } from './app/app.config.server';
import { UserComponent } from './app/shared/components/user/user.component';
import {App} from "./app/app";


// Phải truyền 'context' vào làm tham số thứ 3
const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(App, config, context);

export default bootstrap;