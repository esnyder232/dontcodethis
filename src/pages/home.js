import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class Home{
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}
}