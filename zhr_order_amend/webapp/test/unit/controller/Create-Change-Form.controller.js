/*global QUnit*/

sap.ui.define([
	"com/epiuse/zhrorderamend/controller/Create-Change-Form.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Create-Change-Form Controller");

	QUnit.test("I should test the Create-Change-Form controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
