import { app } from '@azure/functions';

import './functions/auth';
import './functions/health';
import './functions/links';
import './functions/linksDeleted';
import './functions/linksSlug';

app.setup({
  enableHttpStream: true,
});
