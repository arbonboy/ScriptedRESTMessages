var RESTMessageScripted = Class.create();
RESTMessageScripted.prototype = Object.extendsObject(RESTMessage, {
	
	/*
 	* Constructor
 	* Takes in an http function name:  get, post, put, delete
 	*/
	initialize: function(funcName, endpoint) {
		this.restMessageGr = new GlideRecord("sys_rest_message");
		this.functionGr = new GlideRecord("sys_rest_message_fn");
		this.headerGr = new GlideRecord("sys_rest_message_headers");
		this.headerGrList = [];
		this.fnHeaderGr = new GlideRecord("sys_rest_message_fn_headers");
		this.fnHeaderGrList = [];
		this.fnParamDefGr = new GlideRecord('sys_rest_message_fn_param_defs');
		this.fnParamDefGrList = [];
		
		this.valid = false;
		this.name;
		this.props = new Packages.java.util.Properties();
		this.funcName = funcName.toLowerCase();
		this.useBasicAuth = false;
		this.userName;
		this.userPassword;
		this.midServer; // mid server name minus mid.server
		this.use_ecc;
		this.eccResponse;
		this.httpStatus;
		this.eccParameters = {};
		this.eccCorrelator;
		this.endPoint = endpoint;
		
		
	},
	
	execute: function(){
		//OVERRIDING PARENT METHOD
		var httpResponse = null;
		var response = 'error';
		this.httpStatus = null;
		
		
		this._handleEndpoint();
		
		var headers = this._handleHeaders();
		var params = this._handleParameters();
		
		var creds = this._handleBasicAuth();
		
		
		if (this.use_ecc) {
			// Build ECC queue payload
			var payload = new GlideXMLDocument('parameters');
			this._addParameterToPayload(payload, 'message_headers', this._getMessageFields(headers));
			this._addParameterToPayload(payload, 'message_parameters', this._getMessageFields(params));
			
			for (var name in this.eccParameters){
				this._addParameterToPayload(payload, name, this.eccParameters[name]);
			}
			
			if (this.useBasicAuth) {
				if (creds) {
					var encrypter = new GlideEncrypter();
					this._addParameterToPayload(payload, 'rest_user', creds.user);
					this._addParameterToPayload(payload, 'rest_password', 'enc:' + encrypter.reencryptForAutomation(creds.password));
				}
			}
			// if the function takes content
			if (this.funcName == 'post' || this.funcName == 'put'){
				this._addParameterToPayload(payload, 'content', this._handleContent());
			}
			this._createECCQueueEntry(payload.toString());
		} else {
			var httpRequest = new GlideHTTPRequest(this.endPoint);
			
			if (this.useBasicAuth) {
				if (creds) {
					var Encrypter = new GlideEncrypter();
					var userpassword = Encrypter.decrypt(creds.password);
					httpRequest.setBasicAuth(creds.user, userpassword);
				}
			}
			
			// Pass the headers through
			for (var h = 0; h < headers.length; h++)
				httpRequest.addHeader(headers[h].name, headers[h].value);
			
			// Pass the parameters through
			for (var i = 0; i < params.length; i++)
				httpRequest.addParameter(params[i].name, params[i].value);
			
			if (this.funcName == 'get')
				httpResponse = this._handleGetRequest(httpRequest);
			else if (this.funcName == 'post')
				httpResponse = this._handlePostRequest(httpRequest, this._handleContent());
			else if (this.funcName == 'put')
				httpResponse = this._handlePutRequest(httpRequest, this._handleContent());
			else if (this.funcName == 'delete')
				httpResponse = this._handleDeleteRequest(httpRequest);
		}
		
		
		return httpResponse;
	},
	
	_handleHeaders: function() {
		//OVERRIDING PARENT METHOD
		var headers = [];

		for(var i in this.fnHeaderGrList){
			var hgr = this.fnHeaderGrList[i];
			//headers['' + hgr.name] = '' + hgr.value;
			var header = {};
			header.name = ""+hgr.name;
			header.value = ""+hgr.value;
			headers.push(header);
		}

        return headers;
	},
	
	_handleParameters: function() {
		//OVERRIDING PARENT METHOD
		var params = [];
        
		for(var i in this.fnParamDefGrList){
			var pgr = this.fnParamDefGrList[i];
            var value = '' + pgr.value;
            var param = {};
            param.name = '' + pgr.name;
            param.value = '' + GlideStringUtil.urlEncode(value);
            params.push(param);
		}
        return params;
	},
	
	_handleContent: function() {
		//OVERRIDING PARENT FUNCTION
		var content = '' + this.functionGr.content;
        return content;  
	},
	
	//Headers
	addHeader: function (name, value){
		var h = new GlideRecord("sys_rest_message_fn_headers");
		h.initialize();
		h.name = name;
		h.value = value;
		this.fnHeaderGrList.push(h);
	},
	
	//Parameters
	addRequestParameter: function (name, value){
		var p = new GlideRecord("sys_rest_message_fn_param_defs");	
		p.initialize();
		p.name = name;
		p.value = value;
		this.fnParamDefGrList.push(p);
	},

	
	//Content
	setContent: function (content){
		this.functionGr.content = content;
	},
	
	
	type: 'RESTMessageScripted'
});