import {StyleSet} from "../Style";
import {styleRule, styleRuleInherit} from "../../decorators/Style";

class TableStyle extends StyleSet {
    cellStyle =  {
        padding: "8px",
        lineHeight: "1.42857143",
        verticalAlign: "top",
        borderTop: "1px solid #ddd",
    };

    theadCellStyle = {
        borderBottom: "2px solid #ddd",
        borderTop: "0",
    };

    @styleRule
    table = {
        width: "100%",
        maxWidth: "100%",
        marginBottom: "20px",
        borderSpacing: "0",
        borderCollapse: "collapse",
        ">*>*>td": this.cellStyle,
        ">*>*>th": this.cellStyle,
        ">*>thead>*>*": this.theadCellStyle,
    };

    @styleRule
    tableStripped = {
        backgroundColor: "#f9f9f9",
    };

}

class SortableTableStyle extends TableStyle {
    @styleRule
    sortIcon = {
        position: "absolute",
        right: "0px",
        bottom: "0px",
        visibility: "hidden",
        float: "right",
    };

    @styleRuleInherit
    table = {
        [" th:hover ." + this.sortIcon]: {
            visibility: "inherit",
        },
    };
}

export {TableStyle, SortableTableStyle};
