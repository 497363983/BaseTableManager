import { i18n } from "@/i18n"
import { FieldType } from "@lark-base-open/js-sdk"
import textIcon from "@/icons/text-icon.vue"
import numberIcon from "@/icons/number-icon.vue"
import singleSelectIcon from "@/icons/singleSelect-icon.vue"
import multiSelectIcon from "@/icons/multiSelect-icon.vue"
import dateTimeIcon from "@/icons/dateTime-icon.vue"
import checkBoxIcon from "@/icons/checkBox-icon.vue"
import userIcon from "@/icons/user-icon.vue"
import phoneIcon from "@/icons/phone-icon.vue"
import urlIcon from "@/icons/url-icon.vue"
import attachmentIcon from "@/icons/attachment-icon.vue"
import singleLinkIcon from "@/icons/singleLink-icon.vue"
import lookupIcon from "@/icons/lookup-icon.vue"
import formulaIcon from "@/icons/formula-icon.vue"
import duplexLinkIcon from "@/icons/duplexLink-icon.vue"
import locationIcon from "@/icons/location-icon.vue"
import groupChatIcon from "@/icons/groupChat-icon.vue"
import createdTimeIcon from "@/icons/createdTime-icon.vue"
import modifiedTimeIcon from "@/icons/modifiedTime-icon.vue"
import createdUserIcon from "@/icons/createdUser-icon.vue"
import modifiedUserIcon from "@/icons/modifiedUser-icon.vue"
import autoNumberIcon from "@/icons/autoNumber-icon.vue"
import barCodeIcon from "@/icons/barCode-icon.vue"
import progressIcon from "@/icons/progress-icon.vue"
import currencyIcon from "@/icons/currency-icon.vue"
import ratingIcon from "@/icons/rating-icon.vue"
import { Message } from "@element-plus/icons-vue"

export const fieldList = {
	[FieldType.Text]: {
		value: FieldType.Text,
		label: "Text",
		icon: textIcon,
	},
	[FieldType.Number]: {
		value: FieldType.Number,
		label: "Number",
		icon: numberIcon,
	},
	[FieldType.SingleSelect]: {
		value: FieldType.SingleSelect,
		label: "SingleSelect",
		icon: singleSelectIcon,
	},
	[FieldType.MultiSelect]: {
		value: FieldType.MultiSelect,
		label: "MultiSelect",
		icon: multiSelectIcon,
	},
	[FieldType.DateTime]: {
		value: FieldType.DateTime,
		label: "DateTime",
		icon: dateTimeIcon,
	},
	[FieldType.Checkbox]: {
		value: FieldType.Checkbox,
		label: "CheckBox",
		icon: checkBoxIcon,
	},
	[FieldType.User]: {
		value: FieldType.User,
		label: "User",
		icon: userIcon,
	},
	[FieldType.Phone]: {
		value: FieldType.Phone,
		label: "Phone",
		icon: phoneIcon,
	},
	[FieldType.Url]: {
		value: FieldType.Url,
		label: "Url",
		icon: urlIcon,
	},
	[FieldType.Attachment]: {
		value: FieldType.Attachment,
		label: "Attachment",
		icon: attachmentIcon,
	},
	[FieldType.SingleLink]: {
		value: FieldType.SingleLink,
		label: "SingleLink",
		icon: singleLinkIcon,
	},
	[FieldType.Lookup]: {
		value: FieldType.Lookup,
		label: "Lookup",
		icon: lookupIcon,
	},
	[FieldType.Formula]: {
		value: FieldType.Formula,
		label: "Formula",
		icon: formulaIcon,
	},
	[FieldType.DuplexLink]: {
		value: FieldType.DuplexLink,
		label: "DuplexLink",
		icon: duplexLinkIcon,
	},
	[FieldType.Location]: {
		value: FieldType.Location,
		label: "Location",
		icon: locationIcon,
	},
	[FieldType.GroupChat]: {
		value: FieldType.GroupChat,
		label: "GroupChat",
		icon: groupChatIcon,
	},
	[FieldType.CreatedTime]: {
		value: FieldType.CreatedTime,
		label: "CreatedTime",
		icon: createdTimeIcon,
	},
	[FieldType.ModifiedTime]: {
		value: FieldType.ModifiedTime,
		label: "ModifiedTime",
		icon: modifiedTimeIcon,
	},
	[FieldType.CreatedUser]: {
		value: FieldType.CreatedUser,
		label: "CreatedUser",
		icon: createdUserIcon,
	},
	[FieldType.ModifiedUser]: {
		value: FieldType.ModifiedUser,
		label: "ModifiedUser",
		icon: modifiedUserIcon,
	},
	[FieldType.AutoNumber]: {
		value: FieldType.AutoNumber,
		label: "AutoNumber",
		icon: autoNumberIcon,
	},
	[FieldType.Barcode]: {
		value: FieldType.Barcode,
		label: "Barcode",
		icon: barCodeIcon,
	},
	[FieldType.Progress]: {
		value: FieldType.Progress,
		label: "Progress",
		icon: progressIcon,
	},
	[FieldType.Currency]: {
		value: FieldType.Currency,
		label: "Currency",
		icon: currencyIcon,
	},
	[FieldType.Rating]: {
		value: FieldType.Rating,
		label: "Rating",
		icon: ratingIcon,
	},
	[FieldType.Email]: {
		value: FieldType.Email,
		label: "Email",
		icon: Message,
	},

}

export const getFieldOptions = (include?: FieldType[]) => {
	return Object.values(fieldList).map((item) => {
		return {
			value: item.value,
			label: i18n.global.t(`fields.${item.label}`),
			icon: item.icon,
		}
	}).filter((item) => {
		if (include) {
			return include.includes(item.value)
		}
		return true
	})
}

export const indexFields = [
	FieldType.Text,
	FieldType.Number,
	FieldType.DateTime,
	FieldType.Url,
	FieldType.Formula,
	FieldType.AutoNumber,
	FieldType.Barcode,
	FieldType.Phone,
	FieldType.Email,
	FieldType.Location,
	FieldType.Progress,
	FieldType.Currency,
]