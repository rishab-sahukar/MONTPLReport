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
        },

        _prepareNavigationParams: function (oFilterData) {
            const oParams = {};

            Object.keys(oFilterData).forEach((sField) => {
                const vValue = oFilterData[sField];

                if (typeof vValue === "string" || typeof vValue === "number") {
                    oParams[sField] = vValue;
                }
            });

            return oParams;
        },

        onNavigate: function () {
            const oSFB = this.byId("smartFilterBar");
            const oFilterData = oSFB.getFilterData();
            const oParams = this._prepareNavigationParams(oFilterData);
            const oCrossAppNav =
                sap.ushell.Container.getService("CrossApplicationNavigation");
            const sHash = oCrossAppNav.hrefForExternal({
                target: {
                    semanticObject: "MyBusinessObject",
                    action: "display"
                },
                params: oParams
            });
            window.open(sHash, "_blank");
        },

        app2onInit: function () {
            const oStartupParams =
                this.getOwnerComponent().getComponentData()?.startupParameters;
            if (oStartupParams) {
                this._mParams = oStartupParams;
            }
        },


        _applyFilters: function () {
            const aFilters = [];
            if (this._mParams.Plant) {
                aFilters.push(new Filter("Plant", "EQ", this._mParams.Plant[0]));
            }
            if (this._mParams.Status) {
                aFilters.push(new Filter("Status", "EQ", this._mParams.Status[0]));
            }
            const oBinding = this.byId("table").getBinding("rows");
            oBinding.setFilter(aFilters);
        }

    });
});