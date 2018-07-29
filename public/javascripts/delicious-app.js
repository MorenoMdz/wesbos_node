import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

autocomplete($('#address'), $('#lng'), $('#lat'));

typeAhead($('.search'));

makeMap($('#map'));

const heartForms = $$('form.heart');
heartForms.on('submit', ajaxHeart);