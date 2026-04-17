sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("sap.ui.test.controller.View1", {
        onInit() {
            const oModel = new JSONModel();
            oModel.attachRequestCompleted(() => {
                console.log("Data:", oModel.getData());
            });
            oModel.attachRequestFailed((e) => {
                console.error("Failed:", e);
            });
            oModel.loadData(
                sap.ui.require.toUrl("sap/ui/test/model/mockData.json")
            );
            this.getView().setModel(oModel);
        }
    });
});