import * as AccUtils from "../accUtils";
import * as ko from "knockout";
import { RESTDataProvider } from "ojs/ojrestdataprovider";
import MutableArrayDataProvider = require("ojs/ojmutablearraydataprovider");
import { ojDialog } from "ojs/ojdialog";
import "ojs/ojdialog";
import "ojs/ojinputtext";
import { ojButtonEventMap } from "ojs/ojbutton";
import "ojs/ojselectsingle";
import "ojs/ojlabel";
import "ojs/ojchart";
import * as storeData from "text!../store_data.json";
import "ojs/ojlistview";
import "ojs/ojavatar";
import { ObservableKeySet } from "ojs/ojknockout-keyset";
import { ojListView } from "ojs/ojlistview";

type ChartType = {
  value: string;
  label: string;
};

type Activity = {
  id: number;
};

type Item = {
  id: number;
  name: string;
  short_desc: string;
  price: number;
  quantity: number;
  quantity_shipped: number;
  quantity_instock: number;
  activity_id: number;
  image: string;
};

type ActivityItems = {
  id: number;
  name: string;
  items: Array<Item>;
  short_desc: string;
  image: string;
};

class DashboardViewModel {
  // Activity key attribute that you'll pass as a parameter when creating 
  // RESTDataProvider instance
  keyAttributes = "id";
  // REST endpoint that returns Activity data
  restServerURLActivities = "https://apex.oracle.com/pls/apex/oraclejet/lp/activities/";
  // RESTDataProvider instance
  activityDataProvider: RESTDataProvider<Activity["id"], Activity>;
  // MutableArraryDataProvider that we no longer use, and
  // so we comment it out.
  // activityDataProvider: MutableArrayDataProvider<Activity["id"], Activity>;
  itemsArray: Array<Object>;
  // itemsDataProvider: MutableArrayDataProvider<Item["id"], Item>;
  // Initialize activityKey to 3 to construct an initial REST call
  activityKey: number = 3;
  // itemsDataProvider: MutableArrayDataProvider<Item["id"], Item>;
  itemsDataProvider: RESTDataProvider<Item["id"], Item>;

  // REST endpoint that returns Item data
  restServerURLItems = "https://apex.oracle.com/pls/apex/oraclejet/lp/activities/" + this.activityKey + "/items/";
  itemData: ko.Observable<any>;
  pieSeriesValue: ko.ObservableArray;
  // Observables for Activities
  selectedActivity = new ObservableKeySet();
  activitySelected = ko.observable(false);  // Controls display of Activity Items
  firstSelectedActivity = ko.observable();
  selectedActivityIds = ko.observable();

  // Observables for Activity Items
  itemSelected = ko.observable(false);
  selectedItem = ko.observable();
  firstSelectedItem = ko.observable();

  itemName: ko.Observable<string>;
  price: ko.Observable<number>;
  short_desc: ko.Observable<string>;
  quantity_instock: ko.Observable<number>;
  quantity_shipped: ko.Observable<number>;
  quantity: number;
  inputImageFile: string = 'css/images/product_images/jet_logo_256.png'

  // Fields in update dialog
  inputItemID: ko.Observable<number>;
  inputItemName: ko.Observable<string>;
  inputPrice: ko.Observable<number>;
  inputShortDesc: ko.Observable<string>; 

  //  Fields for delete button and update dialog, among others
  selectedRow = ko.observable<number>();


  constructor() {
    // Initialize fields in create dialog

    this.itemName = ko.observable<string>();
    this.price = ko.observable<number>();
    this.short_desc = ko.observable<string>();
    this.quantity_instock = ko.observable<number>();
    this.quantity_shipped = ko.observable<number>();
    this.quantity = 0;

    // Initialize fields in update dialog
    this.inputItemID = ko.observable();
    this.inputItemName = ko.observable();
    this.inputPrice = ko.observable();
    this.inputShortDesc = ko.observable();
    // inputImageFile has already been initialized.
    // this.activityDataProvider = new MutableArrayDataProvider<
    //   Activity["id"],
    //   Activity
    // >(JSON.parse(storeData), {
    //   keyAttributes: "id",
    // });
    this.activityDataProvider = new RESTDataProvider({
      keyAttributes: this.keyAttributes,
      url: this.restServerURLActivities,
      transforms: {
         fetchFirst: {
         request: async (options) => {
            const url = new URL(options.url);
            const { size, offset } = options.fetchParameters;
            url.searchParams.set("limit", String(size));
            url.searchParams.set("offset", String(offset));
            return new Request(url.href);
         },
         response: async ({ body }) => {
            const { items, totalSize, hasMore } = body;
            return { data: items, totalSize, hasMore };   
         },
         },
      },
   });
    let activitiesArray = JSON.parse(storeData);
    let itemsArray = activitiesArray[0].items;

    // this.itemsDataProvider = new MutableArrayDataProvider<Item["id"], Item>(
    //   itemsArray,
    //   { keyAttributes: "id" }
    // );

    this.itemData = ko.observable('');
    this.itemData(activitiesArray[0].items[0]);

    this.pieSeriesValue = ko.observableArray([]);

    let pieSeries = [
      { name: "Quantity in Stock", items: [this.itemData().quantity_instock] },
      { name: "Quantity Shipped", items: [this.itemData().quantity_shipped] }
    ];
    this.pieSeriesValue(pieSeries);
  }

  // Open dialog
  public showCreateDialog(event: ojButtonEventMap["ojAction"]) {
    (document.getElementById("createDialog") as ojDialog).open();
  }

  // Create item and close dialog
  public createItem = async (event: ojButtonEventMap["ojAction"]) => {
    this.quantity = (Number(this.quantity_instock()) + Number(this.quantity_shipped()));

    const row = {
       name: this.itemName(),
       short_desc: this.short_desc(),
       price: this.price(),
       quantity_instock: this.quantity_instock(),
       quantity_shipped: this.quantity_shipped(),
       quantity: this.quantity,
       activity_id: this.activityKey,
       image: this.inputImageFile,
       };

    // Create and send request to REST service to add row
    const request = new Request(this.restServerURLItems, {
      headers: new Headers({
        "Content-type": "application/json; charset=UTF-8",
      }),
      body: JSON.stringify(row),
      method: "POST",
    });

    const response = await fetch(request);
    const addedRow = await response.json();
    
    // Create add mutate event and call mutate method
    // to notify dataprovider that a row has been
    // added
    const addedRowKey = addedRow[this.keyAttributes];
    const addedRowMetaData = { key: addedRowKey };
    this.itemsDataProvider.mutate({
    add: {
       data: [addedRow],
       keys: new Set([addedRowKey]),
       metadata: [addedRowMetaData],
    },
    });
    this.itemsDataProvider.refresh();
    
    (document.getElementById("createDialog") as ojDialog).close();
  }

  public showEditDialog = (event: ojButtonEventMap["ojAction"]) => {
    this.inputItemName(this.itemData().name);
    this.inputPrice(this.itemData().price);
    this.inputShortDesc(this.itemData().short_desc);
    
    (document.getElementById("editDialog") as ojDialog).open();
  }

  
  public updateItemSubmit = async (event: ojButtonEventMap["ojAction"]) => {

    const currentRow = this.selectedRow;
    if (currentRow != null) {
      const row = {
        itemId: this.itemData().id,
        name: this.inputItemName(),
        price: this.inputPrice(),
        short_desc: this.inputShortDesc()
      };

      // Create and send request to update row on rest service
      const request = new Request(

        `${this.restServerURLItems}${this.itemData().id}`,
        {
          headers: new Headers({
            "Content-type": "application/json; charset=UTF-8",
          }),
          body: JSON.stringify(row),
          method: "PUT",
        }
      );
      const response = await fetch(request);
      const updatedRow = await response.json();
      // Create update mutate event and call mutate method
      // to notify dataprovider consumers that a row has been
      // updated
      const updatedRowKey = this.itemData().id;
      const updatedRowMetaData = { key: updatedRowKey };
      this.itemsDataProvider.mutate({
        update: {
          data: [updatedRow.items[0]],
          keys: new Set([updatedRowKey]),
          metadata: [updatedRowMetaData],
        },
      });
      this.itemsDataProvider.refresh();
    }; // End if statement


    (document.getElementById("editDialog") as ojDialog).close();
  }

  public deleteItem = async (event: ojButtonEventMap["ojAction"]) => {
    let itemID = this.firstSelectedItem().data.id;
    const currentRow = this.selectedRow;
    if (currentRow != null) {
      let really = confirm("Are you sure you want to delete this item?");
      if (really) {
        // Create and send request to delete row on REST service
        const request = new Request(
          `${this.restServerURLItems}${itemID}`,
          { method: "DELETE" }
        );
        const response = await fetch(request);
        // Create remove mutate event and call mutate method
        // to notify data-provider consumers that a row has been
        // removed
        if (response.status === 200) {
          const removedRowKey = itemID;
          const removedRowMetaData = { key: removedRowKey };
   
          this.itemsDataProvider.mutate({
            remove: {
              data: [itemID],
              keys: new Set([removedRowKey]),
              metadata: [removedRowMetaData],
            },
          });
          this.itemsDataProvider.refresh();   
        }
        else {
          alert("Delete failed with status " + response.status + " : " + response.statusText)
        }
      }
    }
  };

  selectedActivityChanged = (event: ojListView.firstSelectedItemChanged<ActivityItems["id"], ActivityItems>) => {
    /**
    *  If no items are selected then the firstSelectedItem property  returns an object 
    *  with both key and data properties set to null.
    */
    let itemContext = event.detail.value.data;

    if (itemContext != null) {
      // If selection, populate and display list
      // Hide currently-selected activity item
      this.activitySelected(false);

      // let itemsArray = itemContext.items;
      // this.itemsDataProvider.data = itemsArray;

         this.activityKey = event.detail.value.data.id;
         this.restServerURLItems = "https://apex.oracle.com/pls/apex/oraclejet/lp/activities/" + this.activityKey + "/items/";
         // Create the itemsDataProvider instance of RESTDataProvider
         this.itemsDataProvider = new RESTDataProvider({
          keyAttributes: this.keyAttributes,
          url: this.restServerURLItems,
          transforms: {
            fetchFirst: {
              request: async (options) => {
              const url = new URL(options.url);
              const { size, offset } = options.fetchParameters;
              url.searchParams.set("limit", String(size));
              url.searchParams.set("offset", String(offset));
              return new Request(url.href);
              },
              response: async ({ body }) => {
              const { items, totalSize, hasMore } = body;
              return { data: items, totalSize, hasMore };
              },
            },
          },
      });   
      // Set List View properties
      this.activitySelected(true);
      this.itemSelected(false);
      this.selectedItem();
      this.itemData();

    } else {
      // If deselection, hide list         
      this.activitySelected(false);
      this.itemSelected(false);
    }
  };

  /**
   * Handle selection from Activity Items list
   */
  selectedItemChanged = (event: ojListView.firstSelectedItemChanged<Item["id"], Item>) => {

    let isClicked = event.detail.value.data;

    if (isClicked != null) {

      // If selection, populate and display list
      this.itemData(event.detail.value.data);

      // Create variable and get attributes of the items list to set pie chart values
      let pieSeries = [
        { name: "Quantity in Stock", items: [this.itemData().quantity_instock] },
        { name: "Quantity Shipped", items: [this.itemData().quantity_shipped] }
      ];
      // Update the pie chart with the data
      this.pieSeriesValue(pieSeries);

      this.itemSelected(true);

    }
    else {
      // If deselection, hide list
      this.itemSelected(false);
    }
  };

  /**
   * Optional ViewModel method invoked after the View is inserted into the
   * document DOM.  The application can put logic that requires the DOM being
   * attached here.
   * This method might be called multiple times - after the View is created
   * and inserted into the DOM and after the View is reconnected
   * after being disconnected.
   */
  connected(): void {
    AccUtils.announce("Dashboard page loaded.");
    document.title = "Dashboard";
    // implement further logic if needed
  }

  /**
   * Optional ViewModel method invoked after the View is disconnected from the DOM.
   */
  disconnected(): void {
    // implement if needed
  }

  /**
   * Optional ViewModel method invoked after transition to the new View is complete.
   * That includes any possible animation between the old and the new View.
   */
  transitionCompleted(): void {
    // implement if needed
  }
}

export = DashboardViewModel;
