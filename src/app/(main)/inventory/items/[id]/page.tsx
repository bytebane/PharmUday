import { ItemDetailsView } from '@/components/features/inventory/items/item-details-view'

interface ItemDetailsPageProps {
	params: {
		id: string
	}
}

export default function ItemDetailsPage({ params }: ItemDetailsPageProps) {
	return <ItemDetailsView itemId={params.id} />
}
