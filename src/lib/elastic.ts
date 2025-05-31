import { Client } from '@elastic/elasticsearch'

export const esClient = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	auth: {
		username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
		password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
	},
	tls: {
		rejectUnauthorized: process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED === 'true',
	},
})
