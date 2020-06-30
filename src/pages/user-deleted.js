import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserDeleted {
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}
}