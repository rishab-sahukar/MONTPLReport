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
        },

        onOpenRemark: function (oEvent) {
            if (!this._oNotePopover) {
                this._oNotePopover = sap.ui.xmlfragment(
                    "sap.ui.test.fragments.RemarkPopover",
                    this
                );
                this.getView().addDependent(this._oNotePopover);
            }

            this._oNotePopover.setBindingContext(
                oEvent.getSource().getBindingContext()
            );

            this._oNotePopover.openBy(oEvent.getSource());
        },

        onCloseNote: function () {
            this._oNotePopover.close();
        },

        onSaveNote: function () {
            this._oNotePopover.close();
            // Persist note if needed
        }

    });
});