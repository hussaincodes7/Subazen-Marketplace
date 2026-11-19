import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProductPage } from '../../../actions';
import getParams from '../../../utils/getParams';
import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import { Carousel } from 'react-responsive-carousel';
import Card from '../../../components/UI/Card';
import usePageMeta from '../../../hooks/usePageMeta';
import { generatePublicUrl } from '../../../urlConfig';

/**
* @author
* @function ProductPage
**/

const ProductPage = (props) => {

    const dispatch = useDispatch();
    const product = useSelector(state => state.product);
    const { page } = product;
    usePageMeta({ title: page.title ? `${page.title} | Subazen` : "Information | Subazen", description: (page.description || "Information from Subazen.").slice(0, 160), canonical: `${window.location.origin}${props.location.pathname}`, schema: page.title ? { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` }, { "@type": "ListItem", position: 2, name: page.title, item: `${window.location.origin}${props.location.pathname}` }] } : null });

    useEffect(() => {
        const params = getParams(props.location.search);
        console.log({params});
        const payload = {
            params
        }
        dispatch(getProductPage(payload));
    }, []);


    return (
        <div style={{ margin: '0 10px' }}>
            <h3>{page.title}</h3>
            <Carousel
                renderThumbs={() => {}}
            >
                {
                    page.banners && page.banners.map((banner, index) => 
                        <a 
                            key={index}
                            style={{ display: 'block' }}
                            href={banner.navigateTo}
                        >
                            <img src={generatePublicUrl(banner.img)} alt="" />
                        </a>
                    )
                }
            </Carousel>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                margin: '10px 0'
            }}>
                {
                    page.products && page.products.map((product, index) => 
                        <Card 
                            key={index}
                            style={{
                                width: '400px',
                                height: '200px',
                                margin: '5px'
                            }}
                        >
                            <img style={{
                                width: '100%',
                                height: '100%'
                            }} src={generatePublicUrl(product.img)} alt="" />
                        </Card>
                    )
                }
            </div>
        </div>
    )

}

export default ProductPage
